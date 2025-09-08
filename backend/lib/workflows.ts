import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import { sentimentAnalysisService } from './sentimentAnalysis';
import { integrationService } from './integrations';

export interface WorkflowTrigger {
  type: 'sentiment_negative' | 'keyword_detected' | 'response_time_exceeded' | 'user_rating_low' | 'conversation_length' | 'time_based';
  conditions: {
    sentiment_threshold?: number;
    keywords?: string[];
    response_time_ms?: number;
    rating_threshold?: number;
    message_count?: number;
    time_condition?: {
      after: string; // HH:mm
      before: string; // HH:mm
      days: string[]; // ['monday', 'tuesday', ...]
    };
  };
}

export interface WorkflowAction {
  type: 'escalate_to_human' | 'send_notification' | 'create_ticket' | 'send_email' | 'transfer_to_agent' | 'auto_response' | 'tag_conversation';
  config: {
    recipient?: string;
    template?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    message?: string;
    department?: string;
    tags?: string[];
    delay_ms?: number;
  };
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  isActive: boolean;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  conditions: 'all' | 'any'; // All triggers must match or any trigger
  priority: number; // Higher number = higher priority
  createdAt: Date;
  lastTriggered?: Date;
  executionCount: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  conversationId: string;
  triggeredBy: string;
  triggeredAt: Date;
  actions: Array<{
    type: string;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
    error?: string;
  }>;
  status: 'pending' | 'completed' | 'failed';
}

class WorkflowEngine {
  
  /**
   * Process conversation for workflow triggers
   */
  async processConversation(conversationId: string, userId: string, context: any): Promise<void> {
    const workflows = await this.getUserWorkflows(userId);
    
    for (const workflow of workflows) {
      if (!workflow.isActive) continue;
      
      const shouldTrigger = await this.evaluateWorkflow(workflow, context);
      if (shouldTrigger) {
        await this.executeWorkflow(workflow, conversationId, context);
      }
    }
  }

  /**
   * Evaluate if workflow should trigger
   */
  private async evaluateWorkflow(workflow: Workflow, context: any): Promise<boolean> {
    const triggerResults = await Promise.all(
      workflow.triggers.map(trigger => this.evaluateTrigger(trigger, context))
    );

    if (workflow.conditions === 'all') {
      return triggerResults.every(result => result);
    } else {
      return triggerResults.some(result => result);
    }
  }

  /**
   * Evaluate individual trigger
   */
  private async evaluateTrigger(trigger: WorkflowTrigger, context: any): Promise<boolean> {
    switch (trigger.type) {
      case 'sentiment_negative':
        if (context.sentiment && context.sentiment.label === 'negative') {
          return context.sentiment.confidence >= (trigger.conditions.sentiment_threshold || 70);
        }
        return false;

      case 'keyword_detected':
        if (trigger.conditions.keywords && context.lastMessage) {
          const messageText = context.lastMessage.content.toLowerCase();
          return trigger.conditions.keywords.some(keyword => 
            messageText.includes(keyword.toLowerCase())
          );
        }
        return false;

      case 'response_time_exceeded':
        return context.responseTime >= (trigger.conditions.response_time_ms || 30000);

      case 'user_rating_low':
        return context.rating && context.rating <= (trigger.conditions.rating_threshold || 2);

      case 'conversation_length':
        return context.messageCount >= (trigger.conditions.message_count || 10);

      case 'time_based':
        return this.evaluateTimeCondition(trigger.conditions.time_condition);

      default:
        return false;
    }
  }

  /**
   * Evaluate time-based condition
   */
  private evaluateTimeCondition(timeCondition?: any): boolean {
    if (!timeCondition) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm
    const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now).toLowerCase();

    const isInTimeRange = currentTime >= timeCondition.after && currentTime <= timeCondition.before;
    const isCorrectDay = timeCondition.days.includes(currentDay);

    return isInTimeRange && isCorrectDay;
  }

  /**
   * Execute workflow actions
   */
  private async executeWorkflow(workflow: Workflow, conversationId: string, context: any): Promise<void> {
    const execution: WorkflowExecution = {
      id: this.generateId(),
      workflowId: workflow.id,
      conversationId,
      triggeredBy: this.determineTriggerReason(workflow, context),
      triggeredAt: new Date(),
      actions: workflow.actions.map(action => ({
        type: action.type,
        status: 'pending'
      })),
      status: 'pending'
    };

    // Save execution record
    await this.saveExecution(execution);

    try {
      // Execute actions in sequence
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        const executionAction = execution.actions[i];

        try {
          // Add delay if specified
          if (action.config.delay_ms) {
            await this.delay(action.config.delay_ms);
          }

          const result = await this.executeAction(action, conversationId, context);
          
          executionAction.status = 'completed';
          executionAction.result = result;
          
        } catch (error) {
          executionAction.status = 'failed';
          executionAction.error = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Workflow action failed:`, error);
        }

        // Update execution record
        await this.updateExecution(execution);
      }

      execution.status = 'completed';
      
      // Update workflow stats
      await this.updateWorkflowStats(workflow.id);

    } catch (error) {
      execution.status = 'failed';
      console.error(`Workflow execution failed:`, error);
    }

    await this.updateExecution(execution);
  }

  /**
   * Execute individual action
   */
  private async executeAction(action: WorkflowAction, conversationId: string, context: any): Promise<any> {
    switch (action.type) {
      case 'escalate_to_human':
        return await this.escalateToHuman(conversationId, action.config, context);

      case 'send_notification':
        return await this.sendNotification(action.config, context);

      case 'create_ticket':
        return await this.createTicket(conversationId, action.config, context);

      case 'send_email':
        return await this.sendEmail(action.config, context);

      case 'transfer_to_agent':
        return await this.transferToAgent(conversationId, action.config);

      case 'auto_response':
        return await this.sendAutoResponse(conversationId, action.config);

      case 'tag_conversation':
        return await this.tagConversation(conversationId, action.config);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Action implementations
   */
  private async escalateToHuman(conversationId: string, config: any, context: any): Promise<any> {
    // Mark conversation for human takeover
    const { db } = await connectToDatabase();
    
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          status: 'escalated',
          escalatedAt: new Date(),
          escalationReason: config.message || 'Automated escalation triggered',
          priority: config.priority || 'medium'
        }
      }
    );

    // Notify appropriate team
    if (config.recipient) {
      await integrationService.processEvent({
        integrationId: config.recipient,
        eventType: 'escalation_triggered',
        payload: {
          conversationId,
          reason: config.message,
          priority: config.priority,
          transcript: context.messages
        },
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0
      });
    }

    return { escalated: true, conversationId };
  }

  private async sendNotification(config: any, context: any): Promise<any> {
    // Send notification via integration
    if (config.recipient) {
      await integrationService.processEvent({
        integrationId: config.recipient,
        eventType: 'message_sent',
        payload: {
          message: config.message,
          template: config.template,
          context
        },
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0
      });
    }

    return { sent: true, recipient: config.recipient };
  }

  private async createTicket(conversationId: string, config: any, context: any): Promise<any> {
    // Create ticket in integrated system
    if (config.recipient) {
      const ticketData = {
        subject: config.template || `Chat Support Request - ${conversationId}`,
        description: context.messages?.map((m: any) => `${m.role}: ${m.content}`).join('\n'),
        priority: config.priority || 'medium',
        conversationId
      };

      await integrationService.processEvent({
        integrationId: config.recipient,
        eventType: 'escalation_triggered',
        payload: ticketData,
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0
      });
    }

    return { ticketCreated: true };
  }

  private async sendEmail(config: any, context: any): Promise<any> {
    // Implementation for email sending
    // This would integrate with your email service
    console.log('Sending email:', config);
    return { emailSent: true };
  }

  private async transferToAgent(conversationId: string, config: any): Promise<any> {
    const { db } = await connectToDatabase();
    
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          assignedAgent: config.department || 'general',
          transferredAt: new Date(),
          status: 'transferred'
        }
      }
    );

    return { transferred: true, department: config.department };
  }

  private async sendAutoResponse(conversationId: string, config: any): Promise<any> {
    const { db } = await connectToDatabase();
    
    const autoMessage = {
      role: 'assistant',
      content: config.message || config.template || 'Thank you for your message. An agent will be with you shortly.',
      timestamp: new Date(),
      automated: true
    };

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      ({ $push: { messages: autoMessage } } as any)
    );

    return { responseSent: true };
  }

  private async tagConversation(conversationId: string, config: any): Promise<any> {
    const { db } = await connectToDatabase();
    
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $addToSet: { 
          tags: { $each: config.tags || [] }
        }
      }
    );

    return { tagged: true, tags: config.tags };
  }

  /**
   * Utility methods
   */
  private async getUserWorkflows(userId: string): Promise<Workflow[]> {
    const { db } = await connectToDatabase();
    const results = await db.collection('workflows')
      .find({ userId, isActive: true })
      .sort({ priority: -1 })
      .toArray();
    return results as unknown as Workflow[];
  }

  private determineTriggerReason(workflow: Workflow, context: any): string {
    // Determine which trigger fired
    return `Workflow "${workflow.name}" triggered`;
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    const { db } = await connectToDatabase();
    await db.collection('workflow_executions').insertOne(execution);
  }

  private async updateExecution(execution: WorkflowExecution): Promise<void> {
    const { db } = await connectToDatabase();
    await db.collection('workflow_executions').updateOne(
      { id: execution.id },
      { $set: execution }
    );
  }

  private async updateWorkflowStats(workflowId: string): Promise<void> {
    const { db } = await connectToDatabase();
    await db.collection('workflows').updateOne(
      { id: workflowId },
      { 
        $inc: { executionCount: 1 },
        $set: { lastTriggered: new Date() }
      }
    );
  }

  /**
   * Public API methods
   */
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'executionCount'>): Promise<string> {
    const { db } = await connectToDatabase();
    
    const newWorkflow: Workflow = {
      ...workflow,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      executionCount: 0
    };

    await db.collection('workflows').insertOne(newWorkflow);
    return newWorkflow.id;
  }

  async getWorkflowExecutions(workflowId: string, limit: number = 50): Promise<WorkflowExecution[]> {
    const { db } = await connectToDatabase();
    const results = await db.collection('workflow_executions')
      .find({ workflowId })
      .sort({ triggeredAt: -1 })
      .limit(limit)
      .toArray();
    return results as unknown as WorkflowExecution[];
  }

  async getWorkflowAnalytics(userId: string): Promise<any> {
    const { db } = await connectToDatabase();
    
    const workflows = (await db.collection('workflows').find({ userId }).toArray()) as unknown as Workflow[];
    const executions = (await db.collection('workflow_executions')
      .find({ workflowId: { $in: workflows.map((w: Workflow) => w.id) } })
      .toArray()) as unknown as WorkflowExecution[];

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.isActive).length,
      totalExecutions: executions.length,
      successRate: executions.length > 0 
        ? (executions.filter(e => e.status === 'completed').length / executions.length) * 100 
        : 0,
      topTriggers: this.getTopTriggers(executions),
      executionTrends: this.getExecutionTrends(executions)
    };
  }

  private getTopTriggers(executions: WorkflowExecution[]): Array<{trigger: string; count: number}> {
    const triggerCounts = new Map<string, number>();
    
    executions.forEach(exec => {
      const trigger = exec.triggeredBy;
      triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
    });

    return Array.from(triggerCounts.entries())
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getExecutionTrends(executions: WorkflowExecution[]): Array<{date: string; count: number}> {
    const daily = new Map<string, number>();
    
    executions.forEach(exec => {
      const date = exec.triggeredAt.toISOString().split('T')[0];
      daily.set(date, (daily.get(date) || 0) + 1);
    });

    return Array.from(daily.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const workflowEngine = new WorkflowEngine();
